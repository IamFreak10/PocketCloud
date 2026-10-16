FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TERM=xterm-256color

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    coreutils \
    curl \
    wget \
    git \
    nano \
    vim-tiny \
    htop \
    iputils-ping \
    net-tools \
    iproute2 \
    python3 \
    ca-certificates \
    sudo \
    unzip \
    tar \
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/run/sshd /var/www/html /root/.ssh
RUN echo 'root:netlab123' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Set up authentic Ubuntu bash environment
RUN echo "alias ll='ls -alF --color=always'" >> /root/.bashrc && \
    echo "alias ls='ls --color=always -C'" >> /root/.bashrc && \
    echo "alias la='ls -A --color=always'" >> /root/.bashrc

# Default web document root
RUN echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>NetLab Ubuntu VPS</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#300a24;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}div{text-align:center;padding:40px;background:rgba(0,0,0,0.4);border-radius:16px;border:1px solid rgba(233,84,32,0.4);}h1{color:#e95420;font-size:2.5rem;margin-bottom:10px;}p{color:#d3d7cf;font-size:1.1rem;}code{background:#1e1e1e;padding:4px 8px;border-radius:4px;color:#8ae234;}</style></head><body><div><h1>⚡ NetLab Ubuntu 24.04 LTS VPS</h1><p>Running live inside NetLab Local Cloud Playground!</p><p>Document Root: <code>/var/www/html</code></p><p>SSH Port: <code>18022</code> | Password: <code>netlab123</code></p></div></body></html>' > /var/www/html/index.html

WORKDIR /root
EXPOSE 22 80

CMD ["/usr/sbin/sshd", "-D"]
