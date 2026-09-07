"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Grid2X2,
  Leaf,
  Plus,
  Sparkles,
  Sprout,
} from "lucide-react";
import type { Workspace, Plant } from "@/lib/workspace/types";
import { parseDay, workspacePath } from "@/lib/workspace/types";
import {
  EmptyState,
  GardenCard,
  PlantCard,
  SectionHeading,
} from "./primitives";
import { TaskList, type ToggleTask } from "./tasks";
import { PlantDetailDialog } from "./library";
export function Dashboard({
  data,
  onToggle,
}: {
  data: Workspace;
  onToggle?: ToggleTask;
}) {
  const [selected, setSelected] = useState<Plant | null>(null);
  const path = (value: string) => workspacePath(data.mode, value);
  const due = data.tasks.filter(
    (t) => t.status !== "done" && t.due_date <= data.today,
  );
  const beds = data.gardens.flatMap((g) => g.beds);
  const plantCount = beds.reduce((n, bed) => n + bed.bed_plants.length, 0);
  const guest = data.mode === "guest";
  const dateLabel = parseDay(data.today).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <main className="page-wrap dashboard-page">
      <div className="dashboard-greeting">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1>
            {guest
              ? "Let’s grow something good."
              : `A good day to grow, ${data.name.split(" ")[0]}.`}
          </h1>
          <p className="page-description">
            {guest
              ? "A little planning. A little care. A garden that feels like you."
              : "A little closer to the garden you’re dreaming of."}
          </p>
        </div>
        <span className="season-label">
          <Leaf size={15} />
          {data.zone ? `Growing zone ${data.zone}` : "Your growing journey"}
        </span>
      </div>
      <section className="garden-hero">
        <Image
          src="/art/kitchen-garden.png"
          alt=""
          fill
          sizes="(max-width: 800px) 100vw, 75vw"
          priority
          className="hero-art"
        />
        <div className="hero-copy">
          <span className="hero-kicker">
            <span />
            YOUR OWN PATCH OF POSSIBILITY
          </span>
          <h2>
            Small beginnings.
            <br />
            <em>Beautiful things.</em>
          </h2>
          <p>
            {guest
              ? "Bring your garden to life, one plant at a time. We’ll help you make a plan and find your rhythm."
              : "A few seeds, a sunny spot, and a plan. Make a little space for what comes next."}
          </p>
          <Link
            href={guest ? "/demo" : path("/gardens")}
            className="button-primary"
          >
            {guest ? "Explore a sample garden" : "Spend a moment in the garden"}
            <ArrowRight size={16} />
          </Link>
          {guest && (
            <Link href="/auth" className="hero-secondary">
              Or start your own <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
        <span className="hero-art-caption">
          a little inspiration for your growing space
        </span>
      </section>
      {!guest && (
        <div className="garden-stats">
          {[
            {
              label: "Gardens to call your own",
              value: data.gardens.length,
              icon: Grid2X2,
              href: "/gardens",
            },
            {
              label: "Plants in your care",
              value: plantCount,
              icon: Sprout,
              href: "/gardens",
            },
            {
              label: "Tasks ready for a little love",
              value: due.length,
              icon: CheckCheck,
              href: "/tasks",
            },
            {
              label: "Garden beds taking shape",
              value: beds.length,
              icon: Leaf,
              href: "/gardens",
            },
          ].map(({ label, value, icon: Icon, href }) => (
            <Link href={path(href)} key={label}>
              <span className="stat-icon">
                <Icon size={19} strokeWidth={1.4} />
              </span>
              <div>
                <strong>{String(value).padStart(2, "0")}</strong>
                <span>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section>
            <SectionHeading
              title={
                guest
                  ? "A garden, with a little guidance."
                  : "Your little growing world"
              }
              href={guest ? "/demo/gardens" : path("/gardens")}
              action={guest ? "Take a look" : "All gardens"}
            />
            {data.gardens.length ? (
              <div className="dashboard-gardens">
                {data.gardens.slice(0, 2).map((g) => (
                  <GardenCard garden={g} mode={data.mode} key={g.id} />
                ))}
              </div>
            ) : guest ? (
              <div className="getting-started paper-card">
                {[
                  {
                    step: "01",
                    title: "Find your patch.",
                    copy: "A raised bed, a balcony, or a sunny corner. Start with the space you have.",
                  },
                  {
                    step: "02",
                    title: "Make a little plan.",
                    copy: "Discover plants and arrange a bed with room for everything to grow.",
                  },
                  {
                    step: "03",
                    title: "Grow into a rhythm.",
                    copy: "Keep the next watering, sowing, and harvest in one thoughtful place.",
                  },
                ].map((item) => (
                  <div key={item.step}>
                    <span>{item.step}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Your first garden is waiting."
                description="You don’t need a big space. Just a little curiosity and something you’d love to grow."
                href="/gardens"
                action="Create a garden"
              />
            )}
          </section>
          {data.plants.length > 0 && (
            <section className="discovery-section">
              <SectionHeading
                title="Meet your next garden favorite"
                href={path("/plants")}
                action="Plant library"
              />
              <div className="dashboard-plants">
                {data.plants.slice(0, 3).map((plant) => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    onSelect={() => setSelected(plant)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="dashboard-aside">
          <section className="paper-card today-care">
            <div className="care-heading">
              <span className="eyebrow">A LITTLE CARE</span>
              <CheckCheck size={18} />
            </div>
            <h2>{guest ? "Find your growing rhythm." : "On the list today"}</h2>
            <p className="card-description">
              {guest
                ? "Small steps make a thriving garden."
                : due.length
                  ? `${due.length} small ${due.length === 1 ? "thing" : "things"} to help your garden thrive.`
                  : "Your garden is ready for its next chapter."}
            </p>
            {guest ? (
              <div className="welcome-care">
                <span>
                  <Sprout size={21} />
                </span>
                <p>
                  Your plants, plans, and daily care.
                  <br />A little more connected.
                </p>
                <Link className="text-link" href="/auth">
                  Start your garden <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <TaskList
                tasks={due.slice(0, 4)}
                today={data.today}
                compact
                onToggle={onToggle}
              />
            )}
            <Link
              href={guest ? "/demo/tasks" : path("/tasks")}
              className="care-view-all"
            >
              {guest ? "See how care tasks work" : "View all care tasks"}
              <ArrowRight size={15} />
            </Link>
          </section>
          <Link href={path("/botanist")} className="botanist-note">
            <div className="botanist-symbol">
              <Sparkles size={23} strokeWidth={1.4} />
            </div>
            <span className="eyebrow">A HELPING HAND</span>
            <h3>
              A question
              <br />
              taking root?
            </h3>
            <p>Make a little sense of your garden with the botanist.</p>
            <span className="text-link">
              Let’s talk plants
              <ArrowUpRight size={16} />
            </span>
          </Link>
          {!guest && !data.zone && (
            <Link className="setup-note" href="/settings">
              <Plus size={20} />
              <div>
                <strong>Find your growing zone</strong>
                <p>Set up your profile for planting dates.</p>
              </div>
              <ArrowRight size={15} />
            </Link>
          )}
        </aside>
      </div>
      <PlantDetailDialog
        plant={selected}
        onClose={() => setSelected(null)}
        mode={data.mode}
      />
    </main>
  );
}
