import { Divider } from "@mantine/core";
import { Navbar } from "@/components/Navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <Divider />
      {children}
    </>
  );
}
