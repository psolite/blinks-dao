
import { web3, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from 'buffer';
import { deriveProposalPDA, program } from "src/anchor/setup";



const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=a6164db1-6978-4a22-9e2d-b63cb67b226e');

const proposalId = new BN(Date.now());

const CreateProposal = async (title: string, description: string, point: number, publicKey: PublicKey, sendTransaction) => {

    try {
        const { proposalPDA } = await deriveProposalPDA(publicKey, proposalId)

        console.log('Creating transaction...');
        const trx = await program.methods.createProposal(title, description, proposalId, point)
            .accounts({
                proposal: proposalPDA,
                user: publicKey,
                systemProgram: web3.SystemProgram.programId,
            })
            .transaction();

        console.log('Transaction created:', trx);

        console.log('Sending transaction...');
        const trxSign = await sendTransaction(
            trx,
            connection,
            { signers: [] }
        );
        console.log(
            `View on explorer: https://solana.fm/tx/${trxSign}?cluster=devnet-alpha`
        );

        const confirmation = await connection.confirmTransaction(trxSign, 'processed');
        console.log('Transaction confirmed:', confirmation);

        const account = await program.account.proposal.fetch(proposalPDA);

        console.log(account)
        return account
    } catch (error) {
        console.error('Error creating proposal:', error);
    }
};


export default CreateProposal;
