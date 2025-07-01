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
