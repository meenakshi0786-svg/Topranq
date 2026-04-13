export interface PublishResult {
  url: string;
  id?: string;
}

export interface PublishConnector {
  platform: string | null;
  siteUrl: string | null;
  authCredentialsEncrypted: string | null;
}

export interface PublishArticle {
  slug: string | null;
  metaTitle: string | null;
  bodyHtml: string | null;
  bodyMarkdown: string | null;
  metaDescription: string | null;
  faqSchemaJson: string | null;
  targetKeyword: string | null;
  featuredImageUrl?: string | null;
}

export async function publishToCMS(
  connector: PublishConnector,
  article: PublishArticle
): Promise<PublishResult> {
  const siteUrl = (connector.siteUrl || "").replace(/\/$/, "");
  const slug = article.slug || "untitled";

  switch (connector.platform) {
    case "shopify": {
      const token = connector.authCredentialsEncrypted;
      if (!token) throw new Error("Shopify API token not configured.");

      const storeDomain = siteUrl.includes("myshopify.com")
        ? siteUrl.replace(/^https?:\/\//, "")
        : siteUrl.replace(/^https?:\/\//, "") + ".myshopify.com";

      const blogsRes = await fetch(`https://${storeDomain}/admin/api/2024-01/blogs.json`, {
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      });
      if (!blogsRes.ok) throw new Error(`Shopify API error: ${blogsRes.status}. Check your API token.`);

      const blogsData = await blogsRes.json();
      const blogId = blogsData.blogs?.[0]?.id;
      if (!blogId) throw new Error("No blog found in your Shopify store.");

      const shopifyArticle: Record<string, unknown> = {
        title: article.metaTitle || "Untitled",
        body_html: article.bodyHtml || article.bodyMarkdown || "",
        author: "Ranqapex",
        tags: article.targetKeyword || "seo",
        published: true,
        summary_html: article.metaDescription || "",
        handle: slug,
      };
      if (article.featuredImageUrl) {
        shopifyArticle.image = {
          src: article.featuredImageUrl,
          alt: article.metaTitle || "Featured image",
        };
      }
      const articleRes = await fetch(`https://${storeDomain}/admin/api/2024-01/blogs/${blogId}/articles.json`, {
        method: "POST",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ article: shopifyArticle }),
      });
      if (!articleRes.ok) {
        const errData = await articleRes.text();
        throw new Error(`Shopify publish failed: ${articleRes.status} ${errData}`);
      }

      const articleData = await articleRes.json();
      const handle = articleData.article?.handle || slug;
      const blogHandle = blogsData.blogs[0]?.handle || "news";
      return {
        url: `https://${storeDomain}/blogs/${blogHandle}/${handle}`,
        id: String(articleData.article?.id || ""),
      };
    }

    case "wordpress": {
      if (!connector.authCredentialsEncrypted) {
        throw new Error("WordPress credentials not configured.");
      }
      let creds: { username: string; password: string };
      try {
        creds = JSON.parse(connector.authCredentialsEncrypted);
      } catch {
        throw new Error("WordPress credentials are malformed. Reconnect the site.");
      }
      if (!creds.username || !creds.password) {
        throw new Error("WordPress username/password missing.");
      }

      const basicAuth = "Basic " + Buffer.from(`${creds.username}:${creds.password}`).toString("base64");
      const baseUrl = siteUrl.replace(/\/$/, "");

      // 1. Upload featured image (if we have one) — WP needs media ID to link via featured_media
      let featuredMediaId: number | undefined;
      if (article.featuredImageUrl) {
        try {
          const imgRes = await fetch(article.featuredImageUrl);
          if (imgRes.ok) {
            const imgBuf = await imgRes.arrayBuffer();
            const fileName = `${slug}.png`;
            const mediaRes = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
              method: "POST",
              headers: {
                "Authorization": basicAuth,
                "Content-Type": "image/png",
                "Content-Disposition": `attachment; filename="${fileName}"`,
              },
              body: imgBuf,
            });
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              featuredMediaId = mediaData.id;
            }
          }
        } catch {
          // Image upload is non-fatal — continue without
        }
      }

      // 2. Create the post
      const postBody: Record<string, unknown> = {
        title: article.metaTitle || "Untitled",
        content: article.bodyHtml || article.bodyMarkdown || "",
        slug,
        status: "publish",
        excerpt: article.metaDescription || "",
      };
      if (featuredMediaId) postBody.featured_media = featuredMediaId;
      if (article.targetKeyword) {
        postBody.tags_input = article.targetKeyword
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          "Authorization": basicAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postBody),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`WordPress publish failed: ${res.status} ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return { url: data.link || `${baseUrl}/${slug}`, id: String(data.id) };
    }

    case "webhook": {
      const res = await fetch(siteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "article_publish",
          title: article.metaTitle,
          slug,
          content: article.bodyHtml || article.bodyMarkdown,
          markdown: article.bodyMarkdown,
          metaDescription: article.metaDescription,
          faqSchema: article.faqSchemaJson ? JSON.parse(article.faqSchemaJson) : null,
          publishedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      return { url: `${siteUrl}/${slug}` };
    }

    default:
      return { url: `${siteUrl}/blog/${slug}` };
  }
}
