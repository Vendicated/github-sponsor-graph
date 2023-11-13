# GitHub Sponsor Graph

A cli tool to generate a graph of your GitHub sponsors!

![Example Graph](./example-graph.png)

## Usage

First, you need to [generate a GitHub API token](https://github.com/settings/tokens/new) with the `read:user` scope

```sh
# Clone Repository
git clone https://github.com/Vendicated/github-sponsor-graph
cd github-sponsor-graph

# Install Dependencies
pnpm i  # or use npm/yarn

# Run
node . YOUR_GITHUB_TOKEN
```

You can customise the graph using several options:

```
Usage: github-sponsor-graph [options] <github-token>

Generate a graph of your GitHub sponsors

Arguments:
  github-token                           Your GitHub API token. Must be a legacy token with read:user permission

Options:
  -V, --version                          output the version number
  -s, --size <size>                      Size of the images in the graph (default: 64)
  -c, --images-per-row <images-per-row>  How many images should be in a row (default: 20)
  -o, --out-file <out-file>              Where to write the graph to (default: "graph.png")
  -d, --skip-default-avatars             Skip default avatars
  -h, --help                             display help for command
```

## License

```
github-sponsor-graph, a tool to generate a graph of your GitHub sponsors
Copyright (c) 2023 Vendicated
SPDX-License-Identifier: GPL-3.0-or-later
```