resource "azurerm_api_management_policy_fragment" "auth" {
  api_management_id = data.azurerm_api_management.apim_itn_api.id
  name              = "io-com-app-send-fragment"
  format            = "xml"
  value             = file("../_modules/apim/fragment/send-fragment.xml")
}
