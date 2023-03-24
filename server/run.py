import json
import os
import random
import socket
import sys

import uvicorn


def is_port_used(port, host="127.0.0.1"):
    a_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    location = (host, port)
    result_of_check = a_socket.connect_ex(location)
    if result_of_check == 0:
        return False
    else:
        return True


def get_open_port(retries=10):
    for _ in range(retries):
        port = random.randint(40_000, 60_000)
        if is_port_used(port):
            return port
    raise Exception("Could not find an open port")


if __name__ == "__main__":
    port = get_open_port()
    print(json.dumps({"msg": "server_starting", "port": port}), flush=True)
    reload = not getattr(sys, "oxidized", False)
    os.environ["AESARA_FLAGS"] = "cxx="
    uvicorn.run(
        "app.main:app", host="127.0.0.1", port=port, access_log=False, reload=reload
    )
