# How the Internet Works

## Overview

The Internet connects many separate computer networks. Shared **protocols**, or communication rules, let devices exchange information even when their hardware and software differ.

Information travels in small pieces called **packets**. Routers forward those packets between networks. The receiving device uses the arriving data to reconstruct messages or display content.

## Loading a web page

A simplified example:

1. **DNS** helps find an IP address for the website's name.
2. The browser establishes a connection.
3. **TLS** can protect the connection with encryption.
4. The browser sends an **HTTP** request.
5. The server returns content that the browser interprets.

```text
Browser -> Local network -> Internet networks -> Web server
Browser <- Local network <- Internet networks <- Response
```

The exact connection steps depend on the protocols in use.

## Useful distinctions

- A **router** forwards traffic between networks.
- A **switch** connects devices within a network.
- A **web server** responds to requests for content.

## Remember

The Internet has no single central computer. It depends on interconnected networks and agreed ways of communicating.

## Source

[Cloudflare Learning Center — How does the Internet work?](https://www.cloudflare.com/learning/network-layer/how-does-the-internet-work/)
