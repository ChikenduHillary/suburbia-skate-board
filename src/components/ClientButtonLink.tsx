"use client";

import { useEffect } from "react";
import { useUser } from "@civic/auth-web3/react";
import { toast } from "sonner";
import { ButtonLink, ButtonProps } from "./ButtonLink";

export function ClientButtonLink(props: ButtonProps) {
  const user = useUser();

  useEffect(() => {
    // This effect runs when the user object is updated
    console.log("User object updated:", user);
  }, [user]);

  const handleClick = (e: React.MouseEvent) => {
    if (!user.user) {
      e.preventDefault();
      toast.error("You need to sign in to build your board", {
        description: "If youre signed in, wait for some seconds and try again.",
      });
      return;
    }
    // If logged in, allow the link to proceed
  };

  return <ButtonLink {...props} onClick={handleClick} />;
}
