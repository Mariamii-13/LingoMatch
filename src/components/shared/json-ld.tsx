/**
 * `JSON.stringify` output can't contain an unescaped `</script>` closing
 * sequence (structured data is user/config-independent today, but this keeps
 * the guarantee cheap regardless — same reasoning as `sanitiseCustomCss`).
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}
