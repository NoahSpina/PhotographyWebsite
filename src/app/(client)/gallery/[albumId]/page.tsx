export default async function GalleryPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;

  return (
    <main>
      <h1>Gallery</h1>
      <p>Placeholder proofing gallery for album {albumId}.</p>
    </main>
  );
}
