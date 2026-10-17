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
    ca-certificates \
    sudo \
    unzip \
    tar \
    procps \
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/run/sshd /root/.ssh
RUN echo 'root:netlab123' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Set up authentic Ubuntu bash environment
RUN echo "alias ll='ls -alF --color=always'" >> /root/.bashrc && \
    echo "alias ls='ls --color=always -C'" >> /root/.bashrc && \
    echo "alias la='ls -A --color=always'" >> /root/.bashrc

WORKDIR /root
EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
