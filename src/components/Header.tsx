import Link from "next/link";
import { Logo } from "./Logo";
import { createClient } from "@prismicio/client";
import { PrismicLink } from "@prismicio/react";
import { UserButton } from "@civic/auth-web3/react";

export async function Header() {
  const client = createClient("suburbia-sb", {});
  const settings = await client.getSingle("settings").catch(() => null);

  return (
    <header className="header absolute left-0 right-0 top-0 z-50 ~h-32/48 ~px-4/6 ~py-4/6 hd:h-32">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto,auto] items-center gap-6 md:grid-cols-[1fr,auto,1fr]">
        <Link href={"/"} className="justify-self-start">
          <Logo className="text-brand-purple ~h-12/20" />
        </Link>

        <nav
          aria-label="Main navigation"
          className="col-span-full row-start-2 md:col-span-1 md:col-start-2 md:row-start-1"
        >
          <ul className="flex flex-wrap items-center justify-center gap-8">
            {settings?.data.navigation.map((item) => (
              <li key={item.link.text}>
                <PrismicLink field={item.link} className="~text-lg/xl" />
              </li>
            ))}
          </ul>
        </nav>
        <div className="justify-self-end">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
