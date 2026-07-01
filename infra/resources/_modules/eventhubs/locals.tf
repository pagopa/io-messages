
locals {
  evhns = {
    allowed_sources = {
      subnet_ids = []
      ips = [
        "18.192.147.151", # PDND
        "18.159.227.69",  # PDND
        "3.126.198.129",  # PDND
        "52.29.215.8",    # PDND
        "63.181.230.22",  # PDND
        "52.29.74.207"    # PDND
      ]
    }
  }
}
