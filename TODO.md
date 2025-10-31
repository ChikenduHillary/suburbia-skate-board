# TODO: Implement Airdrop Logic in useSolBalance Hook

- [x] Modify `src/helpers/getSolBalance.ts`:
  - [x] Add necessary imports: Connection, clusterApiUrl from @solana/web3.js
  - [x] Add an async `attemptAirdrop` function that tries airdrop up to 3 times using the provided code snippet
  - [x] In the `getBalance` function, after fetching balance, if balance is 0, call `attemptAirdrop`
  - [x] After successful airdrop, immediately refetch the balance
  - [x] Handle errors and log them appropriately

# TODO: Implement Balance Check and Airdrop in MintNFTButton

- [x] Modify `src/app/build/mint-nft-button.tsx`:
  - [x] Add necessary imports: Connection, clusterApiUrl, LAMPORTS_PER_SOL from @solana/web3.js
  - [x] Add an `attemptAirdrop` function (similar to the one in `useSolBalance`)
  - [x] In `handleMintNFT`, before the `try` block, check the current balance using `connection.getBalance(publicKey)`
  - [x] If balance is 0, call `attemptAirdrop`, then refetch balance
  - [x] If after airdrop balance is still 0, show an error and return
  - [x] Proceed with minting only if balance > 0

- [ ] Followup steps:
  - [ ] Test the functionality by checking if airdrop works when balance is 0 (ensure devnet connection)
  - [ ] Verify balance updates after airdrop
  - [ ] Test the minting process with a 0 balance wallet to ensure airdrop works before minting
  - [ ] Verify that minting fails gracefully if airdrop fails
