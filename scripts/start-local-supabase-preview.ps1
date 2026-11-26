$workspace = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $workspace
try {
  $statusOutput = npx --yes supabase@3.4.0 status --workdir .test-artifacts/supabase-zero-cost --output json
  if ($LASTEXITCODE -ne 0) { throw 'Inicia primero Supabase local según docs/LOCAL_SETUP.md.' }
  $status = $statusOutput | Out-String | ConvertFrom-Json
  if ($status.API_URL -ne 'http://127.0.0.1:54421' -or -not $status.ANON_KEY -or -not $status.SERVICE_ROLE_KEY) {
    throw 'La referencia o las claves locales de Supabase no coinciden.'
  }
  $env:NEXT_PUBLIC_SUPABASE_URL = $status.API_URL
  $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $status.ANON_KEY
  $env:SUPABASE_SERVICE_ROLE_KEY = $status.SERVICE_ROLE_KEY
  $env:NEXT_PUBLIC_SITE_URL = 'http://localhost:3030'
  $env:MASH_STAGING = '1'
  $env:MASH_GA_ENABLED = '0'
  $env:MASH_GA_PROPERTY_ID = ' '
  $env:MASH_DEEPL_API_KEY = ' '
  $env:MASH_LOCAL_PREVIEW = '3030'
  npm run dev -- --hostname 127.0.0.1 --port 3030
} finally {
  Pop-Location
}
