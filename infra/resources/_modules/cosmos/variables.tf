variable "cosmosdb_account" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
}
