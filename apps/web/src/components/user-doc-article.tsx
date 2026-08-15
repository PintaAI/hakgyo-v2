import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

export function UserDocArticle({ content }: { content: string }) {
  return (
    <article className="mx-auto w-full max-w-4xl pb-20">
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-heading mb-5 text-4xl font-semibold tracking-tight text-balance">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-heading mt-12 mb-4 scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-heading mt-8 mb-3 scroll-m-20 text-xl font-semibold tracking-tight">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-foreground/85 my-4 leading-7">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-4 ml-6 list-disc space-y-2 leading-7">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal space-y-2 leading-7">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-primary/40 bg-muted/40 my-6 rounded-r-lg border-l-4 px-5 py-1 italic">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              className="text-primary font-medium underline underline-offset-4"
              href={href}
            >
              {children}
            </a>
          ),
          code: ({ children, className }) =>
            className ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
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
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b px-4 py-3 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b px-4 py-3 align-top last:border-b-0">
              {children}
            </td>
          ),
          hr: () => <hr className="border-border my-10" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
