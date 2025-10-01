import { asImageSrc, createClient } from "@prismicio/client";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import { FooterPhysics } from "@/components/FooterPhysics";
import { Bounded } from "@/components/Bounded";

export async function Footer() {
  const client = createClient("suburbia-sb", {});
  const settings = await client.getSingle("settings").catch(() => null);

  const boardTextureURLs = settings?.data.footer_skateboards
    .map((board) => asImageSrc(board.skateboard, { h: 600 }))
    .filter((url): url is string => Boolean(url));

  return (
    <footer className="bg-texture bg-zinc-900 text-white overflow-hidden">
      <div className="relative h-[75vh] ~p-10/16 md:aspect-auto">
        <PrismicNextImage
          field={settings?.data.footer_image}
          alt=""
          fill
          className="object-cover"
          width={1200}
        />
        <FooterPhysics
          boardTextureURLs={boardTextureURLs || []}
          className="absolute inset-0 overflow-hidden"
        />
      </div>

      <Bounded as="nav">
        <ul className="flex flex-wrap justify-center gap-8 ~text-lg/xl">
          {settings?.data.navigation.map((item) => (
            <li key={item.link.text} className="hover:underline">
              <PrismicNextLink field={item.link} />
            </li>
          ))}
        </ul>
      </Bounded>
    </footer>
  );
}
