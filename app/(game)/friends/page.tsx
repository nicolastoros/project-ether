import { getFriendsAndRequests } from "@/app/actions/friends";
import { FriendsClient } from "@/components/hub/FriendsClient";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { friends, incoming, outgoing } = await getFriendsAndRequests();

  return (
    <FriendsClient
      initialFriends={friends}
      initialIncoming={incoming}
      initialOutgoing={outgoing}
    />
  );
}
