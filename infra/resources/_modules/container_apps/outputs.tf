output "paymentup" {
  value = {
    url = module.payment_updater_ca_itn_01.url
  }
}

output "reminder" {
  value = {
    url = module.reminder_ca_itn_01.url
  }
}

output "messages" {
  value = {
    url = module.messages_ca.url
  }
}

output "messages_api_authentication" {
  value = {
    client_id          = azuread_application.messages_api.client_id
    application_id_uri = "api://${azuread_application.messages_api.client_id}"
  }
}
