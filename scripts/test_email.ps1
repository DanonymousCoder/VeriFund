# Send a test email through the notification service.
# Requires notification-service on http://127.0.0.1:8006 (or set $NotifyUrl).

param(
    [string]$Email = "olumidemichelle@gmail.com",
    [string]$NotifyUrl = "http://127.0.0.1:8006"
)

$body = @{
    email   = $Email
    subject = "VeriFund test"
    message = "Email is working."
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$NotifyUrl/api/notify/email/" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$response | ConvertTo-Json -Depth 5
Write-Host "`nIf status is 'sent', check inbox and spam for $Email"
