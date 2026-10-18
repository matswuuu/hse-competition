import type {Ref} from 'react'
import {Link, type LinkProps} from 'react-router'

/** Lets MUI links and buttons take `href` and navigate with the router (absolute URLs stay external). */
export default function LinkBehavior({
  href,
  ref,
  ...props
}: Omit<LinkProps, 'to'> & { href: LinkProps['to']; ref?: Ref<HTMLAnchorElement> }) {
  return <Link ref={ref} to={href} {...props} />
}
