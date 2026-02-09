# Frontend Runtime Config

The frontend no longer hardcodes production API or Cloudinary endpoints in `js/common.js`.

## Source of truth
- `js/runtime-config.js` (loaded before `js/common.js` on all pages)
- Runtime keys:
  - `API_BASE`
  - `CLOUDINARY_URL`

## Generate from environment
```bash
cd Shared-Story-frontend
TSTS_API_BASE=https://api.example.com \
TSTS_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/<cloud>/image/upload \
./scripts/write_runtime_config.sh
```

## Local override (QA only)
- `localStorage.API_BASE`
- `localStorage.CLOUDINARY_URL`

## Security note
- Keep runtime config limited to public values only.
- Never place secrets in frontend runtime config.
