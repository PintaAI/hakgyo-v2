import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import Link from "~/components/link";
import { UserDocPreviewFrame } from "~/components/user-doc-preview-frame";
import type { UserDocHeading } from "~/lib/user-doc-headings";

type MarkdownNode = { position?: { start: { line: number } } };

/** Custom HTML tags the guide Markdown may use. */
type DocPreviewProps = {
  name?: string;
  caption?: string;
  device?: string;
  height?: string;
};

export function UserDocArticle({
  content,
  headings,
  afterTitle,
}: {
  content: string;
  headings: UserDocHeading[];
  afterTitle?: ReactNode;
}) {
  const headingIds = new Map(
    headings.map((heading) => [heading.line, heading.id]),
  );
  const idFor = (node: MarkdownNode | undefined) =>
    node?.position ? headingIds.get(node.position.start.line) : undefined;

  const components: Components & {
    "doc-preview": (props: DocPreviewProps) => ReactNode;
  } = {
    h1: ({ children }) => (
      <>
        <h1 className="font-heading mb-4 text-2xl font-semibold tracking-tight text-balance sm:mb-5 sm:text-4xl">
          {children}
        </h1>
        {afterTitle}
      </>
    ),
    h2: ({ children, node }) => (
      <h2
        id={idFor(node)}
        className="font-heading mt-8 mb-3 scroll-m-20 border-b pb-2 text-lg font-semibold tracking-tight sm:mt-12 sm:mb-4 sm:text-2xl"
      >
        {children}
      </h2>
    ),
    h3: ({ children, node }) => (
      <h3
        id={idFor(node)}
        className="font-heading mt-6 mb-2 scroll-m-20 text-base font-semibold tracking-tight sm:mt-8 sm:mb-3 sm:text-xl"
      >
        {children}
      </h3>
    ),
    // Markdown wraps a one-line `<doc-preview>` or an image in a paragraph;
    // both render block elements, which a <p> cannot contain.
    p: ({ children, node }) =>
      node?.children.some(
        (child) =>
          child.type === "element" &&
          (child.tagName === "doc-preview" || child.tagName === "img"),
      ) ? (
        <>{children}</>
      ) : (
        <p className="text-foreground/85 my-3 text-sm leading-6 sm:my-4 sm:text-base sm:leading-7">
          {children}
        </p>
      ),
    ul: ({ children }) => (
      <ul className="my-3 ml-5 list-disc space-y-1.5 text-sm leading-6 sm:my-4 sm:ml-6 sm:space-y-2 sm:text-base sm:leading-7">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-3 ml-5 list-decimal space-y-1.5 text-sm leading-6 sm:my-4 sm:ml-6 sm:space-y-2 sm:text-base sm:leading-7">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-primary/50 bg-muted/50 my-5 rounded-r-lg border-l-4 px-3 py-0.5 text-sm leading-6 sm:my-6 sm:px-4 sm:py-1 [&_p]:my-2.5 [&_p]:text-sm [&_p]:leading-6 sm:[&_p]:my-3">
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => {
      const className = "text-primary font-medium underline underline-offset-4";
      return href?.startsWith("/") ? (
        <Link className={className} href={href}>
          {children}
        </Link>
      ) : (
        <a
          className={className}
          href={href}
          target={href?.startsWith("#") ? undefined : "_blank"}
          rel={href?.startsWith("#") ? undefined : "noreferrer"}
        >
          {children}
        </a>
      );
    },
    img: ({ src, alt, title }) => (
      <figure className="my-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- guide images have unknown sizes */}
        <img
          src={typeof src === "string" ? src : undefined}
          alt={alt ?? ""}
          loading="lazy"
          className="h-auto max-w-full rounded-xl border"
        />
        {title ? (
          <figcaption className="text-muted-foreground mt-2 text-sm">
            {title}
          </figcaption>
        ) : null}
      </figure>
    ),
    code: ({ children, className }) =>
      className ? (
        <code className={className}>{children}</code>
      ) : (
        <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm break-words">
          {children}
        </code>
      ),
    pre: ({ children }) => (
      <pre className="bg-muted my-6 overflow-x-auto rounded-xl border p-5 font-mono text-sm leading-6">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-xs sm:text-sm [&_tbody_tr:last-child_td]:border-b-0">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
    th: ({ children }) => (
      <th className="border-b px-3 py-2 text-left font-semibold sm:px-4 sm:py-3">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b px-3 py-2 align-top sm:px-4 sm:py-3">
        {children}
      </td>
    ),
    hr: () => <hr className="border-border my-10" />,
    "doc-preview": ({ name, caption, device, height }) =>
      name ? (
        <UserDocPreviewFrame
          name={name}
          caption={caption}
          device={device === "desktop" || device === "mobile" ? device : "both"}
          maxHeight={height ? Number(height) : undefined}
        />
      ) : null,
  };

  return (
    <article className="w-full min-w-0 pb-12">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
