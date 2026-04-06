import { OdmPublicViewer } from "@/components/odm-public-viewer";
import { fetchWebOdmPublicTaskData } from "@/lib/webodm";

const defaultTaskUrl =
  "https://cloud2.webodm.net/public/task/3c6607c1-2507-456e-8483-92acaa4f54ae/map/?t=orthophoto";

export default async function Home() {
  let initialTask = null;
  let initialError = "";

  try {
    initialTask = await fetchWebOdmPublicTaskData(defaultTaskUrl);
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "The public WebODM task could not be loaded.";
  }

  return (
    <main className="odm-page">
      <OdmPublicViewer
        initialError={initialError}
        initialTask={initialTask}
        initialUrl={defaultTaskUrl}
      />
    </main>
  );
}
