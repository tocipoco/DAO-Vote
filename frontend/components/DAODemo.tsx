"use client";

import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useEncryptedDAO } from "@/hooks/useEncryptedDAO";
import { errorNotDeployed } from "./ErrorNotDeployed";
import { useState } from "react";

/*
 * Main Encrypted DAO React component with DAO governance features:
 *  - Member management (join DAO)
 *  - Proposal creation
 *  - Encrypted voting (Yes/No)
 *  - Vote result decryption
 */
export const DAODemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const [newProposalDesc, setNewProposalDesc] = useState<string>("");
  const [votingPeriodDays, setVotingPeriodDays] = useState<number>(7);

  //////////////////////////////////////////////////////////////////////////////
  // FHEVM instance
  //////////////////////////////////////////////////////////////////////////////

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  //////////////////////////////////////////////////////////////////////////////
  // useEncryptedDAO is a custom hook containing all the DAO logic
  //////////////////////////////////////////////////////////////////////////////

  const dao = useEncryptedDAO({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  //////////////////////////////////////////////////////////////////////////////
  // UI Components
  //////////////////////////////////////////////////////////////////////////////

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 p-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-green-400 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Encrypted DAO Governance</h2>
          <p className="text-slate-600 max-w-md">
            Connect your MetaMask wallet to participate in privacy-preserving governance
          </p>
          <button
            className="btn-primary text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-50"
            disabled={isConnected}
            onClick={connect}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Connect to MetaMask</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (dao.isDeployed === false) {
    return errorNotDeployed(chainId);
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-500 to-green-400 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">DAO Dashboard</h2>
            <p className="text-blue-50 text-sm font-mono">Contract: EncryptedDAO.sol</p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <p className="text-xs text-blue-100 mb-1">Total Members</p>
              <p className="text-4xl font-bold">{dao.memberCount.toString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Info */}
        <div className="bg-white rounded-xl shadow-md card-hover p-6 border-l-4 border-blue-500">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">Network</h3>
          </div>
          <div className="space-y-2">
            <InfoRow label="Chain ID" value={chainId?.toString() || "N/A"} />
            <InfoRow 
              label="Account" 
              value={accounts && accounts.length > 0 ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` : "No account"} 
            />
          </div>
        </div>

        {/* FHEVM Status */}
        <div className="bg-white rounded-xl shadow-md card-hover p-6 border-l-4 border-green-500">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">FHEVM</h3>
          </div>
          <div className="space-y-2">
            <StatusBadge status={fhevmStatus} />
            {fhevmError && <p className="text-xs text-red-600 mt-2">{fhevmError.message}</p>}
          </div>
        </div>

        {/* Member Status */}
        <div className="bg-white rounded-xl shadow-md card-hover p-6 border-l-4 border-purple-500">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">Membership</h3>
          </div>
          <div className="space-y-3">
            {dao.isMember ? (
              <div className="status-badge bg-green-100 text-green-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Active Member</span>
              </div>
            ) : (
              <div className="status-badge bg-gray-100 text-gray-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Not a Member</span>
              </div>
            )}
            <button
              className="w-full btn-success text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={dao.isMember || dao.isAddingMember}
              onClick={dao.joinDAO}
            >
              {dao.isAddingMember ? "Joining..." : dao.isMember ? "Already Joined" : "Join DAO"}
            </button>
          </div>
        </div>
      </div>

      {/* Create Proposal Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-400 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-xl text-slate-800">Create New Proposal</h3>
            <p className="text-sm text-slate-600">Submit a proposal for DAO members to vote on</p>
          </div>
        </div>
        
        {!dao.canCreateProposal && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-800">You must be a DAO member to create proposals</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Proposal Description</label>
            <textarea
              value={newProposalDesc}
              onChange={(e) => setNewProposalDesc(e.target.value)}
              placeholder="Describe your proposal in detail..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Voting Period (Days)</label>
            <input
              type="number"
              value={votingPeriodDays}
              onChange={(e) => setVotingPeriodDays(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
            />
          </div>
          <button
            className="w-full btn-primary text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!dao.canCreateProposal || !newProposalDesc.trim() || dao.isCreatingProposal}
            onClick={() => {
              dao.createProposal(newProposalDesc.trim(), BigInt(votingPeriodDays * 24 * 60 * 60));
              setNewProposalDesc("");
            }}
          >
            {dao.isCreatingProposal ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Creating Proposal...</span>
              </span>
            ) : "Create Proposal"}
          </button>
        </div>
      </div>

      {/* Proposals List */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-400 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-800">Active Proposals</h3>
              <p className="text-sm text-slate-600">{dao.proposals.length} total proposals</p>
            </div>
          </div>
          <button
            className="btn-primary text-white px-6 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
            disabled={dao.isRefreshing}
            onClick={dao.refreshProposals}
          >
            {dao.isRefreshing ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </span>
            )}
          </button>
        </div>

        {dao.proposals.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-500 text-lg font-medium">No proposals yet</p>
            <p className="text-slate-400 text-sm mt-2">Create the first proposal above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dao.proposals.map((proposal) => {
              const isActive =
                BigInt(Math.floor(Date.now() / 1000)) >= proposal.startTime &&
                BigInt(Math.floor(Date.now() / 1000)) < proposal.endTime &&
                !proposal.executed;
              const isEnded = BigInt(Math.floor(Date.now() / 1000)) >= proposal.endTime;
              const isSelected = dao.selectedProposalId === proposal.id;

              return (
                <div
                  key={proposal.id.toString()}
                  className={`border-2 rounded-xl p-6 transition-all ${
                    isSelected 
                      ? "border-blue-500 bg-blue-50 shadow-lg" 
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-bold text-lg text-slate-800">
                          Proposal #{proposal.id.toString()}
                        </h4>
                        {isActive && (
                          <span className="status-badge bg-green-100 text-green-700">
                            <span className="w-2 h-2 bg-green-500 rounded-full pulse-animation"></span>
                            <span>Active</span>
                          </span>
                        )}
                        {isEnded && !proposal.executed && (
                          <span className="status-badge bg-amber-100 text-amber-700">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <span>Voting Ended</span>
                          </span>
                        )}
                        {proposal.executed && (
                          <span className="status-badge bg-slate-100 text-slate-700">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Executed</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 font-mono mb-3">
                        Proposer: {proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-6)}
                      </p>
                      <p className="text-slate-700 mb-4 leading-relaxed">{proposal.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Start: {new Date(Number(proposal.startTime) * 1000).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>End: {new Date(Number(proposal.endTime) * 1000).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>{proposal.totalVoters.toString()} voters</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vote Results Section */}
                  {isSelected && dao.yesVotesHandle && dao.noVotesHandle && (
                    <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border border-blue-200">
                      <h5 className="font-semibold text-slate-800 mb-4 flex items-center space-x-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Voting Results</span>
                      </h5>
                      {dao.clearYesVotes && dao.clearNoVotes ? (
                        <div className="space-y-3">
                          <div className="bg-white rounded-lg p-4 border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-700">Yes Votes</span>
                              <span className="text-2xl font-bold text-green-600">{dao.clearYesVotes.clear.toString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all" 
                                style={{
                                  width: `${(Number(dao.clearYesVotes.clear) / (Number(dao.clearYesVotes.clear) + Number(dao.clearNoVotes.clear)) * 100) || 0}%`
                                }}
                              ></div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-red-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-700">No Votes</span>
                              <span className="text-2xl font-bold text-red-600">{dao.clearNoVotes.clear.toString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-red-500 h-2 rounded-full transition-all" 
                                style={{
                                  width: `${(Number(dao.clearNoVotes.clear) / (Number(dao.clearYesVotes.clear) + Number(dao.clearNoVotes.clear)) * 100) || 0}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-slate-600 mb-4">Votes are encrypted. Click below to decrypt results.</p>
                          <button
                            className="btn-primary text-white px-6 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
                            disabled={!dao.canDecrypt || dao.isDecrypting}
                            onClick={dao.decryptVotes}
                          >
                            {dao.isDecrypting ? (
                              <span className="flex items-center space-x-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Decrypting...</span>
                              </span>
                            ) : "Decrypt Results"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Voting Actions */}
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <button
                      className="btn-success text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      disabled={!isActive || !dao.canVote || dao.isVoting}
                      onClick={() => dao.vote(proposal.id, true)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{dao.isVoting ? "Voting..." : "Vote Yes"}</span>
                    </button>
                    <button
                      className="bg-gradient-to-br from-red-500 to-red-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                      disabled={!isActive || !dao.canVote || dao.isVoting}
                      onClick={() => dao.vote(proposal.id, false)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{dao.isVoting ? "Voting..." : "Vote No"}</span>
                    </button>
                    <button
                      className="bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                      disabled={dao.isRefreshing}
                      onClick={() => dao.loadVoteHandles(proposal.id)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>View Results</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Display */}
      {dao.message && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-md">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800 mb-1">System Message</h4>
              <p className="text-slate-700">{dao.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-mono font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-700 border-green-200";
      case "loading":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "ready") {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    } else if (status === "loading") {
      return (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    } else if (status === "error") {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className={`status-badge border ${getStatusColor(status)}`}>
      {getStatusIcon(status)}
      <span className="capitalize">{status}</span>
    </div>
  );
}
