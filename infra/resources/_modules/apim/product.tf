resource "azurerm_api_management_product" "apim_itn_product_io_com" {
  product_id   = "io-com-product"
  display_name = "IO COM"
  description  = "Product for the IO Comunication team"

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name

  approval_required = false
  published         = true
}

resource "azurerm_api_management_product_policy" "apim_itn_product_io_com_policy" {
  product_id = azurerm_api_management_product.apim_itn_product_io_com.product_id

  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name

  xml_link = "https://raw.githubusercontent.com/pagopa/io-messages/2b0d3d226b95f731c4a6fdf58daff2e6dfcb4ef0/infra/resources/_modules/apim/product/policy.xml"
}