resource "azurerm_api_management_policy_fragment" "auth" {
  api_management_id = data.azurerm_api_management.apim_itn_api.id
  name              = "io-com-app-session-fragment"
  format            = "rawxml"
  value             = file("../_modules/apim/fragment/session-fragment.xml")
}
