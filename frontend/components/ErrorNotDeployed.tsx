export function errorNotDeployed(chainId: number | undefined) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-200">
          {/* Error Header */}
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Contract Not Deployed</h2>
              <p className="text-slate-700 text-lg">
                The <span className="font-mono bg-red-50 px-2 py-1 rounded text-red-700">EncryptedDAO.sol</span> contract 
                is not deployed on{" "}
                <span className="font-mono bg-blue-50 px-2 py-1 rounded text-blue-700">
                  chainId={chainId}
                </span>{" "}
                {chainId === 11155111 && <span className="text-slate-600">(Sepolia)</span>}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">What does this mean?</p>
                <p>
                  The contract has either not been deployed yet, or the deployment address is missing 
                  from the ABI directory at <span className="font-mono bg-amber-100 px-1 rounded">DAO/frontend/abi</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Deployment Instructions */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Deploy the Contract</span>
            </h3>
            <p className="text-slate-600 text-sm mb-3">
              Run the following command from the backend directory to deploy:
            </p>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
              <p className="text-slate-500 text-xs mb-2"># from DAO/backend</p>
              <p className="text-green-400">
                npx hardhat deploy --network{" "}
                <span className="text-blue-400">
                  {chainId === 11155111 ? "sepolia" : "your-network-name"}
                </span>
              </p>
            </div>
          </div>

          {/* Alternative Solution */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">Alternative Option</p>
                <p className="text-blue-800">
                  Switch to the local <span className="font-mono bg-blue-100 px-1 rounded">Hardhat Node</span> network 
                  using your MetaMask browser extension.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

