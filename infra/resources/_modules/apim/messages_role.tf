# resource "azuread_app_role_assignment" "messages_api" {
#   app_role_id         = local.messages_invoke_role_id
#   principal_object_id = data.azurerm_api_management.apim_itn_platform_api.identity[0].principal_id
#   resource_object_id  = data.azuread_service_principal.entra_auth_app.object_id
# }
