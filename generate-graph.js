/*
 * github-sponsor-graph, a tool to generate a graph of your GitHub sponsors
 * Copyright (c) 2023 Vendicated
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createCanvas, loadImage } from "canvas";
import { InvalidArgumentError } from "commander";
import { program } from "commander";
import { readFileSync, writeFileSync } from "fs";

const { name, description, version } = JSON.parse(readFileSync("./package.json", "utf8"));

function parseNumber(value) {
    const parsed = Number(value);
    if (isNaN(parsed)) throw new InvalidArgumentError("Not a number.");
    return parsed;
}

program
    .name(name)
    .description(description)
    .version(version)
    .argument("<github-token>", "Your GitHub API token. Must be a legacy token with read:user permission")
    .option("-s, --size <size>", "Size of the images in the graph", parseNumber, 64)
    .option("-c, --images-per-row <images-per-row>", "How many images should be in a row", parseNumber, 20)
    .option("-o, --out-file <out-file>", "Where to write the graph to", "graph.png")
    .option("-d, --skip-default-avatars", "Skip default avatars")
    .option("-p --include-private", "Also include private sponsors")
    .parse();

const [GITHUB_TOKEN] = program.args;
const {
    size,
    imagesPerRow,
    outFile: OUT_FILE,
    skipDefaultAvatars: SKIP_DEFAULT_AVATARS,
    includePrivate,
} = program.opts();
const IMAGE_SIZE = Number(size);
const IMAGES_PER_ROW = Number(imagesPerRow);

const HEADERS = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "User-Agent": "github-sponsor-graph (https://github.com/Vendicated/github-sponsor-graph)",
};

async function fetchDonorPfps(username, after = null) {
    const query = `
      {
        user(login: ${JSON.stringify(username)}) {
          sponsors(first: 100, after: ${JSON.stringify(after)}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              ... on User {
                avatarUrl,
                sponsorshipForViewerAsSponsorable {
                  privacyLevel
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ query }),
    });

    if (!res.ok) {
        const msg = await res.text().catch(() => "Unknown Error");
        throw new Error(`Failed to fetch sponsors: ${res.status}\n${msg}`);
    }

    const { data, errors } = await res.json();
    if (errors) throw new Error("Failed to fetch sponsors:\n" + JSON.stringify(errors, null, 4));

    const {
        pageInfo: { hasNextPage, endCursor },
        nodes,
    } = data.user.sponsors;

    const avatarUrls = nodes
        .filter(n => includePrivate || n.sponsorshipForViewerAsSponsorable.privacyLevel === "PUBLIC")
        .map(n => n.avatarUrl);

    if (hasNextPage) {
        const nextPages = await fetchDonorPfps(username, endCursor);
        avatarUrls.push(...nextPages);
    }

    return avatarUrls;
}

async function generateGraph(username) {
    const avatarUrls = await fetchDonorPfps(username);

    const images = await Promise.all(
        avatarUrls.map(async urlString => {
            const url = new URL(urlString);
            url.searchParams.set("size", IMAGE_SIZE);

            const res = await fetch(url);
            if (!res.ok) return null;

            const buf = await res.arrayBuffer();

            return loadImage(Buffer.from(buf));
        })
    ).then(images => {
        images = images.filter(Boolean);
        if (SKIP_DEFAULT_AVATARS) images = images.filter(img => img.height === IMAGE_SIZE || img.width === IMAGE_SIZE);

        return images;
    });

    const imageCount = images.length;
    const width = IMAGE_SIZE * IMAGES_PER_ROW;
    const rowCount = (imageCount / IMAGES_PER_ROW) * IMAGE_SIZE;
    const height = Math.ceil(rowCount / IMAGE_SIZE) * IMAGE_SIZE;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    let col = 0;
    let row = 0;
    for (const img of images) {
        ctx.drawImage(img, col * IMAGE_SIZE, row * IMAGE_SIZE, IMAGE_SIZE, IMAGE_SIZE);

        if (++col === IMAGES_PER_ROW) {
            col = 0;
            row++;
        }
    }

    return canvas.toBuffer();
}

const { login } = await fetch("https://api.github.com/user", {
    headers: HEADERS,
}).then(res => res.json());

if (!login) {
    console.error("Failed to fetch user info. Is your token valid and has the read:user scope?");
    process.exit(1);
}

console.log("Generating graph for " + login);

const graph = await generateGraph(login);

writeFileSync(OUT_FILE, graph);

console.log("Done! Graph written to " + OUT_FILE);
