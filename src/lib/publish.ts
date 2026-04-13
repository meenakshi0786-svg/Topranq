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

      const articleRes = await fetch(`https://${storeDomain}/admin/api/2024-01/blogs/${blogId}/articles.json`, {
        method: "POST",
        headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        body: JSON.stringify({
          article: {
            title: article.metaTitle || "Untitled",
            body_html: article.bodyHtml || article.bodyMarkdown || "",
            author: "Ranqapex",
            tags: article.targetKeyword || "seo",
            published: true,
            summary_html: article.metaDescription || "",
            handle: slug,
          },
        }),
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
      const wpApiUrl = `${siteUrl}/wp-json/wp/v2/posts`;
      const res = await fetch(wpApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.metaTitle || "Untitled",
          content: article.bodyHtml || article.bodyMarkdown || "",
          slug,
          status: "publish",
          excerpt: article.metaDescription || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { url: data.link || `${siteUrl}/${slug}`, id: String(data.id) };
      }
      return { url: `${siteUrl}/${slug}` };
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
