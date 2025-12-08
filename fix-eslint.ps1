# Fix ESLint unescaped entities errors

# Fix policy-list.tsx
$file = "c:\Ushan\coullax-cmp\Coullax_ERP\components\admin\policy-list.tsx"
(Get-Content $file -Raw) -replace 'Are you sure you want to delete "([^"]+)"\? This action cannot be undone\.', 'Are you sure you want to delete &quot;$1&quot;? This action cannot be undone.' | Set-Content $file

# Fix help/page.tsx apostrophes
$file2 = "c:\Ushan\coullax-cmp\Coullax_ERP\app\(dashboard)\help\page.tsx"
if (Test-Path $file2) {
    (Get-Content $file2 -Raw) -replace "([^\w])'([^\w])", '$1&apos;$2' | Set-Content $file2
}

# Fix requests-client.tsx apostrophes
$file3 = "c:\Ushan\coullax-cmp\Coullax_ERP\app\(dashboard)\requests\requests-client.tsx"
if (Test-Path $file3) {
    (Get-Content $file3 -Raw) -replace "([^\w])'([^\w])", '$1&apos;$2' | Set-Content $file3
}

# Fix settings/page.tsx apostrophes
$file4 = "c:\Ushan\coullax-cmp\Coullax_ERP\app\(dashboard)\super-admin\settings\page.tsx"
if (Test-Path $file4) {
    (Get-Content $file4 -Raw) -replace "([^\w])'([^\w])", '$1&apos;$2' | Set-Content $file4
}

# Fix document-request-dialog.tsx apostrophes
$file5 = "c:\Ushan\coullax-cmp\Coullax_ERP\components\documents\document-request-dialog.tsx"
if (Test-Path $file5) {
    (Get-Content $file5 -Raw) -replace "([^\w])'([^\w])", '$1&apos;$2' | Set-Content $file5
}

Write-Host "ESLint errors fixed!"
