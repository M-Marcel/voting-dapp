import React, { useState, useEffect } from 'react';
import Onboard from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import { ethers } from 'ethers';
import VotingAbi from './Voting.json';
import './App.css';

const SEPOLIA_RPC_URL = `https://sepolia.infura.io/v3/${process.env.REACT_APP_INFURA_KEY}`;

const injected = injectedModule();

const onboard = Onboard({
  wallets: [injected],
  chains: [
    {
      id: '0xaa36a7',
      token: 'ETH',
      label: 'Sepolia',
      rpcUrl: SEPOLIA_RPC_URL
    }
  ]
});

function App() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [votingContract, setVotingContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Track loading state

  useEffect(() => {
    const initWalletConnection = async () => {
      const connectedWallets = await onboard.connectWallet();
      setWallets(connectedWallets);

      if (connectedWallets[0]) {
        const ethersProvider = new ethers.providers.Web3Provider(connectedWallets[0].provider, 'any');
        const signer = ethersProvider.getSigner();
        const contractAddress = process.env.REACT_APP_VOTING_CONTRACT_ADDRESS;
        const contract = new ethers.Contract(contractAddress as string, VotingAbi, signer);
        setVotingContract(contract);
        await fetchCandidates(contract);
      }
    };

    initWalletConnection();
  }, []);

  const fetchCandidates = async (contract: ethers.Contract) => {
    try {
      setLoading(true);
      const candidatesList = await contract.getAllCandidates();
      setCandidates(candidatesList);
    } catch (error) {
      console.error("Failed to fetch candidates", error);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (candidateId: number) => {
    if (votingContract) {
      try {
        setLoading(true);
        console.log("candidateId", candidateId)
        const tx = await votingContract.vote(candidateId);
         await tx.wait();
        await fetchCandidates(votingContract);
      } catch (error) {
        console.error("Failed to vote", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const addCandidate = async () => {
    if (votingContract && newCandidateName) {
      try {
        setLoading(true);
        const tx = await votingContract.addCandidate(newCandidateName);
        await tx.wait();
        setNewCandidateName('');
        await fetchCandidates(votingContract);
      } catch (error) {
        console.error("Failed to add candidate", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetVotes = async () => {
    if (votingContract) {
      try {
        setLoading(true);
        const tx = await votingContract.resetVotes();
        await tx.wait();
        await fetchCandidates(votingContract);
      } catch (error) {
        console.error("Failed to reset votes", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '800px', margin: 'auto', textAlign: 'center' }}>
      <h1 style={{ color: '#333', marginBottom: '40px' }}>Voting DApp</h1>
      <button 
        onClick={() => onboard.connectWallet()} 
        style={{
          backgroundColor: '#4CAF50', 
          color: 'white', 
          padding: '10px 20px', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        {wallets.length > 0 ? 'Wallet Connected' : 'Connect Wallet'}
      </button>

      <div style={{ marginBottom: '30px' }}>
        <input
          type="text"
          value={newCandidateName}
          onChange={(e) => setNewCandidateName(e.target.value)}
          placeholder="New candidate name"
          style={{
            padding: '10px', 
            width: 'calc(100% - 120px)', 
            marginRight: '10px', 
            borderRadius: '5px', 
            border: '1px solid #ccc'
          }}
          disabled={loading} 
        />
        <button 
          onClick={addCandidate} 
          disabled={wallets.length === 0 || loading}
          style={{
            backgroundColor: '#2196F3', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer'
          }}
        >
          Add Candidate
        </button>
      </div>

      {loading && <p>Loading...</p>}


      <ul style={{ listStyle: 'none', padding: 0 }}>
        {candidates.map((candidate) => (
          <li 
            key={candidate.id.toString()} 
            style={{
              marginBottom: '15px', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '5px', 
              backgroundColor: '#f9f9f9'
            }}
          >
            <span style={{ fontWeight: 'bold' }}>{candidate.name}</span> - Votes: {candidate.voteCount.toString()}
            <button 
              onClick={() => vote(candidate.id)} 
              disabled={wallets.length === 0 || loading}
              style={{
                backgroundColor: '#FF5722', 
                color: 'white', 
                padding: '5px 10px', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer', 
                marginLeft: '20px'
              }}
            >
              Vote
            </button>
          </li>
        ))}
      </ul>

      <button 
        onClick={resetVotes} 
        disabled={wallets.length === 0 || loading}
        style={{
          backgroundColor: '#f44336', 
          color: 'white', 
          padding: '10px 20px', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Reset Voting Session
      </button>
      <p><b><i>You can only vote once in a session, connect another user/wallet and to vote in the same session</i></b></p>
    </div>
  );
}

export default App;
