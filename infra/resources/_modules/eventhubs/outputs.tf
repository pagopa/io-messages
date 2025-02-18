output "namespace" {
  value = {
    id   = module.etl.namespace_id
    name = module.etl.name
  }
}
