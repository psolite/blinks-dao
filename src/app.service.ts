import { BN, web3 } from '@coral-xyz/anchor';
import { Injectable } from '@nestjs/common';
import { ActionGetResponse, ActionPostResponse, createPostResponse } from '@solana/actions';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { clusterApiUrl, Connection, ParsedAccountData, PublicKey, Transaction } from '@solana/web3.js';
import { deriveProposalPDA, deriveVoterPDA, program } from './anchor/setup';
import { NextActionLink } from "@solana/actions-spec";

@Injectable()
export class AppService {
  constructor(
  ) { }

  async getReq(req: Request) {

    const res: ActionGetResponse = {
      icon: "https://news.miami.edu/_assets/images-stories/2023/02/dao-web3-hero-940x529.jpg",
      title: "Create an DAO",
      description: `Fill in the information to get a blinks {<a href="bulldeveloper.com">Visit</>}`,
      label: "Get",
      type: "action",
      links: {
        actions: [
          {
            href: req.url,
            label: "Buy",
            parameters: [
              {
                name: "title",
                label: "I want to Launch a meme Coin",
                type: "text"
              },
              {
                name: "description",
                label: "What do you think",
                type: "textarea"
              },
            ]
          }
        ]
      }
    }
    return res
  }

  async postReq(req: any) {

    const pubKey = req.body.account
    console.log(pubKey)
    const data = req.body.data
    console.log(data)
    const publicKey = new PublicKey(pubKey)
    const serialTx = await this.CreateProposal(data.title, data.description, 10, publicKey)
    
    const res = await createPostResponse({
      fields: {
        links: {
          next: this.getCompletedAction(`${req.url}/voting/${serialTx.PDA}`)
        },
        transaction: serialTx.trx,
        message: `Your DAO ID is ${serialTx.PDA}`
      },
    })

    return res
  }

  getCompletedAction (PDA: string):NextActionLink   {
    return {
      type: "inline",
      action: {
        description: `Blinks for your vote ${PDA}`,
        icon: `https://news.miami.edu/_assets/images-stories/2023/02/dao-web3-hero-940x529.jpg`,
        label: `Action Label`,
        title: `Action completed`,
        type: "completed",
      },
    };
  };



  async CreateProposal(title: string, description: string, point: number, user: PublicKey) {
    const network = clusterApiUrl('devnet');
    const connection = new Connection(network, 'confirmed');

    const proposalId = new BN(Date.now());
    try {
      const { proposalPDA } = await deriveProposalPDA(user, proposalId)

      console.log('Creating transaction...');
      const trx = await program.methods.createProposal(title, description, proposalId, point)
        .accounts({
          proposal: proposalPDA,
          user: user,
          systemProgram: web3.SystemProgram.programId,
        })
        .transaction();

      // Set the recent blockhash and fee payer
      trx.recentBlockhash = (await connection.getLatestBlockhash({ commitment: "finalized" })).blockhash;
      trx.feePayer = user;


      // console.log('Sending transaction...');
      // // Serialize the transaction
      // const serializedTx = trx.serialize({
      //   requireAllSignatures: false,
      //   verifySignatures: false,
      // }).toString('base64');
      // console.log('Serialized Transaction:', serializedTx);
      const PDA = proposalPDA.toString()
      return { trx, PDA }
      // const trxSign = await sendTransaction(
      //   trx,
      //   connection,
      //   { signers: [] }
      // );
      // console.log(
      //   `View on explorer: https://solana.fm/tx/${trxSign}?cluster=devnet-alpha`
      // );



      // const confirmation = await connection.confirmTransaction(trxSign, 'processed');
      // console.log('Transaction confirmed:', confirmation);

      // const account = await program.account.proposal.fetch(proposalPDA);

      // console.log(account)
      // return account
    } catch (error) {
      console.error('Error creating proposal:', error);
    }
  };

  async voteGet(req: any, proposalPDA: string) {

    const proposalAccount = await program.account.proposal.fetch(proposalPDA);
    // console.log(proposalAccount)
    const res: ActionGetResponse = {
      icon: "https://news.miami.edu/_assets/images-stories/2023/02/dao-web3-hero-940x529.jpg",
      title: `${proposalAccount.title}`,
      description: `${proposalAccount.description}`,
      label: "Get",
      type: "action",
      links: {
        actions: [
          {
            href: `${req.url}?voteOption=For`,
            label: `Yes - ${proposalAccount.votesFor.toNumber()}`,
          },
          {
            href: `${req.url}?voteOption=Against`,
            label: `No - ${proposalAccount.votesAgainst.toNumber()}`,
          },
          {
            href: `${req.url}?voteOption=Abstain`,
            label: `Abstain - ${proposalAccount.votesAbstain.toNumber()}`,
          },
        ]
      }
    }
    return res
  }

  async votePost(req: any, proposalPDA: string, voteOption: "For" | "Against" | "Abstain") {
    const pubKey = req.body.account
    const proposalPublicKey = new PublicKey(proposalPDA)
    const user = new PublicKey(pubKey)

    const voters = await program.account.voter.all()

    const hasVoted = voters.some(voter =>
      voter.account.user.equals(user) &&
      voter.account.proposal.equals(proposalPublicKey)
    );

    if (hasVoted) {
      return { error: "You have voted" }
    }

    console.log(pubKey)
    const data = req.body.data
    console.log(data)
    const serialTx = await this.vote(proposalPublicKey, user, voteOption)
    const res: ActionPostResponse = {
      transaction: serialTx,
      message: `Thank for voting`
    }

    return res
  }

  async vote(proposalPublicKey: PublicKey, user: PublicKey, voteOption: "For" | "Against" | "Abstain") {
    const network = clusterApiUrl('devnet');
    const connection = new Connection(network, 'confirmed');



    const { voterPDA } = await deriveVoterPDA(user, proposalPublicKey)
    try {
      let voteMethod;
      if (voteOption === "For") {
        voteMethod = program.methods.vote({ for: {} });
      } else if (voteOption === "Against") {
        voteMethod = program.methods.vote({ against: {} });
      } else {
        voteMethod = program.methods.vote({ abstain: {} });
      }
      if (!voteMethod) {
        console.log("ohh")
      }
      const trx = new web3.Transaction().add(
        await voteMethod
          .accounts({
            proposal: proposalPublicKey,
            voter: voterPDA,
            user: user,
            systemProgram: web3.SystemProgram.programId,
          })
          .instruction()

      );

      // Set the recent blockhash and fee payer
      trx.recentBlockhash = (await connection.getLatestBlockhash({ commitment: "finalized" })).blockhash;
      trx.feePayer = user;


      console.log('Sending transaction...');
      // Serialize the transaction
      const serializedTx = trx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString('base64');
      console.log('Serialized Transaction:', serializedTx);

      return serializedTx


    } catch (error) {
      console.error('Error voting:', error);

    }
  }
}
