
locals {
  evhns = {
    allowed_sources = {
      subnet_ids = []
      ips = [
        "18.192.147.151", # PDND
        "18.159.227.69",  # PDND
        "3.126.198.129"   # PDND
      ]
    }
  }
}
