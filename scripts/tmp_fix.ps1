='src/messages/en.json'
=Get-Content  -Raw
= -replace '(" perception\.sentiment\.driverCategory\.volatility\: \Volatility\,\r?\n \perception\.sentiment\.driverCategory\.drift\: \Price drift\,)\r?\n', '\r\n '
Set-Content -Path -Value -Encoding utf8
