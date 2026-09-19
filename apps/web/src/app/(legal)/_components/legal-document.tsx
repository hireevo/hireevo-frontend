interface LegalSection {
  heading: string;
  body: string[];
}

/**
 * The shared shape of a legal page: a title, when it takes effect, a short
 * notice, and a set of headed sections. The content is authored per page; this
 * only lays it out, so the two documents read consistently.
 */
export function LegalDocument({
  title,
  effective,
  notice,
  sections,
}: {
  title: string;
  effective: string;
  notice: string;
  sections: LegalSection[];
}) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-content-accent">
          {title}
        </h1>
        <p className="text-sm text-content-subtle">Effective {effective}</p>
      </header>

      <p className="rounded-lg bg-surface-accent-subtle px-4 py-3 text-sm leading-relaxed text-content">
        {notice}
      </p>

      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-content-accent">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-content">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
