module "apim" {
  source = "../_modules/apim"

  prefix                = local.prefix
  env_short             = local.env_short
  location              = local.location
  location_short        = local.location_short
  legacy_location_short = local.legacy_location_short
  domain                = local.domain
}
