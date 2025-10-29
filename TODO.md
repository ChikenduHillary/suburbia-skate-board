# TODO: Enable 3D View for NFTs on Profile Page

## Steps to Complete

- [x] Import `Link` from `next/link` in `src/components/Profile.tsx`
- [x] Modify the board card rendering in `src/components/Profile.tsx` to wrap each card in a `Link` component
- [x] Add logic to construct the `href` dynamically using the board's `attributes` array to build query parameters (e.g., `wheel=<value>&deck=<value>&...`)
- [x] Handle cases where `attributes` are missing or malformed by linking to `/build` without params
- [x] Update TypeScript types to include `attributes` in board objects
- [ ] Test the functionality by clicking an NFT on the profile page to verify navigation to `/build` and correct 3D view loading
