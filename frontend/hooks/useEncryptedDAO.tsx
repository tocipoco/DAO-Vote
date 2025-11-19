"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { EncryptedDAOAddresses } from "@/abi/EncryptedDAOAddresses";
import { EncryptedDAOABI } from "@/abi/EncryptedDAOABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type EncryptedDAOInfoType = {
  abi: typeof EncryptedDAOABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

export type Proposal = {
  id: bigint;
  proposer: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  executed: boolean;
  totalVoters: bigint;
};

function getEncryptedDAOByChainId(
  chainId: number | undefined
): EncryptedDAOInfoType {
  if (!chainId) {
    return { abi: EncryptedDAOABI.abi };
  }

  const entry =
    EncryptedDAOAddresses[chainId.toString() as keyof typeof EncryptedDAOAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: EncryptedDAOABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: EncryptedDAOABI.abi,
  };
}

export const useEncryptedDAO = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<bigint | undefined>(undefined);
  const [yesVotesHandle, setYesVotesHandle] = useState<string | undefined>(undefined);
  const [noVotesHandle, setNoVotesHandle] = useState<string | undefined>(undefined);
  const [clearYesVotes, setClearYesVotes] = useState<ClearValueType | undefined>(undefined);
  const [clearNoVotes, setClearNoVotes] = useState<ClearValueType | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [isCreatingProposal, setIsCreatingProposal] = useState<boolean>(false);
  const [isAddingMember, setIsAddingMember] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [isMember, setIsMember] = useState<boolean>(false);
  const [memberCount, setMemberCount] = useState<bigint>(BigInt(0));

  const encryptedDAORef = useRef<EncryptedDAOInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isVotingRef = useRef<boolean>(isVoting);

  const encryptedDAO = useMemo(() => {
    const c = getEncryptedDAOByChainId(chainId);
    encryptedDAORef.current = c;
    // Only hint when chainId is known AND address is missing/zero
    if (
      typeof c.chainId === "number" &&
      (!c.address || c.address === ethers.ZeroAddress)
    ) {
      setMessage(`EncryptedDAO deployment not found for chainId=${c.chainId}.`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!encryptedDAO) {
      return undefined;
    }
    // If chainId is unknown, do not claim not-deployed
    if (typeof encryptedDAO.chainId !== "number") {
      return undefined;
    }
    // Known chain, but no address => not deployed
    if (!encryptedDAO.address || encryptedDAO.address === ethers.ZeroAddress) {
      return false;
    }
    return true;
  }, [encryptedDAO]);

  // Check if user is a member
  const refreshMemberStatus = useCallback(async () => {
    if (!encryptedDAO.address || !ethersReadonlyProvider || !ethersSigner) {
      return;
    }

    try {
      const contract = new ethers.Contract(
        encryptedDAO.address,
        encryptedDAO.abi,
        ethersReadonlyProvider
      );
      const userAddress = await ethersSigner.getAddress();
      const memberStatus = await contract.isMember(userAddress);
      setIsMember(memberStatus);
      
      const count = await contract.getMemberCount();
      setMemberCount(count);
    } catch (e) {
      console.error("Failed to check member status:", e);
    }
  }, [encryptedDAO.address, encryptedDAO.abi, ethersReadonlyProvider, ethersSigner]);

  // Refresh proposals list
  const refreshProposals = useCallback(async () => {
    if (!encryptedDAO.address || !ethersReadonlyProvider) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    try {
      const contract = new ethers.Contract(
        encryptedDAO.address,
        encryptedDAO.abi,
        ethersReadonlyProvider
      );

      const count = await contract.getProposalCount();
      const proposalList: Proposal[] = [];

      for (let i = BigInt(1); i <= count; i++) {
        const proposal = await contract.getProposal(i);
        proposalList.push({
          id: proposal.id,
          proposer: proposal.proposer,
          description: proposal.description,
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          executed: proposal.executed,
          totalVoters: proposal.totalVoters,
        });
      }

      setProposals(proposalList);
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    } catch (e) {
      setMessage("Failed to load proposals: " + e);
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [encryptedDAO.address, encryptedDAO.abi, ethersReadonlyProvider]);

  // Load encrypted vote handles for a proposal
  const loadVoteHandles = useCallback(async (proposalId: bigint) => {
    if (!encryptedDAO.address || !ethersReadonlyProvider) {
      return;
    }

    try {
      const contract = new ethers.Contract(
        encryptedDAO.address,
        encryptedDAO.abi,
        ethersReadonlyProvider
      );

      const [yesHandle, noHandle] = await contract.getEncryptedVotes(proposalId);
      setYesVotesHandle(yesHandle);
      setNoVotesHandle(noHandle);
      setSelectedProposalId(proposalId);
      // Invalidate previous decrypted results so user can re-decrypt updated totals
      setClearYesVotes(undefined);
      setClearNoVotes(undefined);
      setMessage("Vote handles loaded. Click 'Decrypt Results' to view updated totals.");
    } catch (e) {
      setMessage("Failed to load vote handles: " + e);
    }
  }, [encryptedDAO.address, encryptedDAO.abi, ethersReadonlyProvider]);

  // Decrypt vote results
  const decryptVotes = useCallback(async () => {
    if (
      isDecryptingRef.current ||
      !yesVotesHandle ||
      !noVotesHandle ||
      !instance ||
      !ethersSigner ||
      !encryptedDAO.address ||
      !selectedProposalId
    ) {
      return;
    }

    if (yesVotesHandle === clearYesVotes?.handle && noVotesHandle === clearNoVotes?.handle) {
      return; // Already decrypted
    }

    const thisChainId = chainId;
    const thisDAOAddress = encryptedDAO.address;
    const thisYesHandle = yesVotesHandle;
    const thisNoHandle = noVotesHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Authorizing and starting decryption...");

    const run = async () => {
      const isStale = () =>
        thisDAOAddress !== encryptedDAORef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        // First, authorize this member to decrypt on-chain (gas tx)
        try {
          const writeContract = new ethers.Contract(
            thisDAOAddress,
            encryptedDAO.abi,
            thisEthersSigner
          );
          const authTx: ethers.TransactionResponse = await writeContract.grantDecryptionAccess(
            selectedProposalId
          );
          setMessage(`Authorizing decryption... tx: ${authTx.hash}`);
          await authTx.wait();
        } catch (authErr) {
          // If authorization fails, continue to show detailed error later
          console.error("grantDecryptionAccess failed:", authErr);
        }

        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [encryptedDAO.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Calling FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          [
            { handle: thisYesHandle, contractAddress: thisDAOAddress },
            { handle: thisNoHandle, contractAddress: thisDAOAddress }
          ],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("Decryption completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setClearYesVotes({ handle: thisYesHandle, clear: res[thisYesHandle] });
        setClearNoVotes({ handle: thisNoHandle, clear: res[thisNoHandle] });

        const yesVotes = Number(res[thisYesHandle]);
        const noVotes = Number(res[thisNoHandle]);
        const total = yesVotes + noVotes;
        const yesRate = total > 0 ? (yesVotes / total * 100).toFixed(2) : "0";
        
        setMessage(`Results: Yes=${yesVotes}, No=${noVotes}, Yes Rate=${yesRate}%`);
      } catch (e) {
        setMessage("Decryption failed: " + e);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    encryptedDAO.address,
    instance,
    yesVotesHandle,
    noVotesHandle,
    chainId,
    sameChain,
    sameSigner,
    clearYesVotes,
    clearNoVotes,
  ]);

  // Cast encrypted vote
  const castVote = useCallback(
    (proposalId: bigint, voteValue: number) => {
      if (isVotingRef.current || !encryptedDAO.address || !instance || !ethersSigner || (voteValue !== 0 && voteValue !== 1)) {
        return;
      }

      const thisChainId = chainId;
      const thisDAOAddress = encryptedDAO.address;
      const thisEthersSigner = ethersSigner;
      const contract = new ethers.Contract(
        thisDAOAddress,
        encryptedDAO.abi,
        thisEthersSigner
      );

      isVotingRef.current = true;
      setIsVoting(true);
      setMessage(`Encrypting vote (${voteValue === 1 ? "Yes" : "No"})...`);

      const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisDAOAddress !== encryptedDAORef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const input = instance.createEncryptedInput(
            thisDAOAddress,
            thisEthersSigner.address
          );
          input.add32(voteValue);

          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Ignore vote");
            return;
          }

          setMessage(`Submitting vote...`);

          const tx: ethers.TransactionResponse = await contract.castVote(
            proposalId,
            enc.handles[0],
            enc.inputProof
          );

          setMessage(`Waiting for transaction: ${tx.hash}...`);

          const receipt = await tx.wait();

          setMessage(`Vote submitted! Status: ${receipt?.status}`);

          if (isStale()) {
            setMessage("Ignore vote");
            return;
          }

          await refreshProposals();
          await loadVoteHandles(proposalId);
          // Ensure next decrypt reflects updated tally
          setClearYesVotes(undefined);
          setClearNoVotes(undefined);
          setMessage("Vote submitted. Please decrypt results again.");
        } catch (e) {
          setMessage(`Vote failed: ${e}`);
        } finally {
          isVotingRef.current = false;
          setIsVoting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      encryptedDAO.address,
      encryptedDAO.abi,
      instance,
      chainId,
      refreshProposals,
      loadVoteHandles,
      sameChain,
      sameSigner,
    ]
  );

  // Create proposal
  const createProposal = useCallback(
    (description: string, votingDuration: bigint) => {
      if (!encryptedDAO.address || !ethersSigner || isCreatingProposal) {
        return;
      }

      setIsCreatingProposal(true);
      setMessage("Creating proposal...");

      const run = async () => {
        try {
          const contract = new ethers.Contract(
            encryptedDAO.address!,
            encryptedDAO.abi,
            ethersSigner
          );

          const tx = await contract.createProposal(description, votingDuration);
          setMessage(`Waiting for transaction: ${tx.hash}...`);

          const receipt = await tx.wait();
          setMessage(`Proposal created! Status: ${receipt?.status}`);

          await refreshProposals();
        } catch (e) {
          setMessage(`Proposal creation failed: ${e}`);
        } finally {
          setIsCreatingProposal(false);
        }
      };

      run();
    },
    [encryptedDAO.address, encryptedDAO.abi, ethersSigner, refreshProposals]
  );

  // Join DAO (add yourself as member)
  const joinDAO = useCallback(() => {
    if (!encryptedDAO.address || !ethersSigner || isAddingMember) {
      return;
    }

    setIsAddingMember(true);
    setMessage("Joining DAO...");

    const run = async () => {
      try {
        const contract = new ethers.Contract(
          encryptedDAO.address!,
          encryptedDAO.abi,
          ethersSigner
        );

        // Use joinDAO() function instead of addMember()
        const tx = await contract.joinDAO();
        setMessage(`Waiting for transaction: ${tx.hash}...`);

        const receipt = await tx.wait();
        setMessage(`Joined DAO! Status: ${receipt?.status}`);

        await refreshMemberStatus();
        await refreshProposals();
      } catch (e) {
        setMessage(`Join DAO failed: ${e}`);
      } finally {
        setIsAddingMember(false);
      }
    };

    run();
  }, [encryptedDAO.address, encryptedDAO.abi, ethersSigner, refreshMemberStatus, refreshProposals, isAddingMember]);

  // Vote wrapper (maps true/false to 1/0)
  const vote = useCallback(
    (proposalId: bigint, voteYes: boolean) => {
      castVote(proposalId, voteYes ? 1 : 0);
    },
    [castVote]
  );

  // Add member (for admin use)
  const addMember = useCallback(
    (newMemberAddress: string) => {
      if (!encryptedDAO.address || !ethersSigner || isAddingMember) {
        return;
      }

      setIsAddingMember(true);
      setMessage("Adding member...");

      const run = async () => {
        try {
          const contract = new ethers.Contract(
            encryptedDAO.address!,
            encryptedDAO.abi,
            ethersSigner
          );

          const tx = await contract.addMember(newMemberAddress);
          setMessage(`Waiting for transaction: ${tx.hash}...`);

          const receipt = await tx.wait();
          setMessage(`Member added! Status: ${receipt?.status}`);

          await refreshMemberStatus();
          await refreshProposals();
        } catch (e) {
          setMessage(`Add member failed: ${e}`);
        } finally {
          setIsAddingMember(false);
        }
      };

      run();
    },
    [encryptedDAO.address, encryptedDAO.abi, ethersSigner, refreshMemberStatus, refreshProposals]
  );

  // Auto refresh on mount
  useEffect(() => {
    refreshProposals();
    refreshMemberStatus();
  }, [refreshProposals, refreshMemberStatus]);

  return {
    contractAddress: encryptedDAO.address,
    isDeployed,
    proposals,
    selectedProposalId,
    yesVotesHandle,
    noVotesHandle,
    clearYesVotes,
    clearNoVotes,
    isRefreshing,
    isDecrypting,
    isVoting,
    isCreatingProposal,
    isAddingMember,
    message,
    isMember,
    memberCount,
    refreshProposals,
    loadVoteHandles,
    decryptVotes,
    vote,
    castVote,
    createProposal,
    joinDAO,
    addMember,
    refreshMemberStatus,
    canDecrypt: Boolean(
      encryptedDAO.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      isMember &&
      yesVotesHandle &&
      noVotesHandle &&
      yesVotesHandle !== ethers.ZeroHash &&
      noVotesHandle !== ethers.ZeroHash
    ),
    canVote: Boolean(
      encryptedDAO.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isVoting &&
      isMember
    ),
    canCreateProposal: Boolean(
      encryptedDAO.address &&
      ethersSigner &&
      !isCreatingProposal &&
      isMember
    ),
  };
};

