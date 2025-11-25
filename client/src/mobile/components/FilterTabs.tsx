interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  { id: "all", label: "All" },
  { id: "signals", label: "Signals" },
  { id: "polls", label: "Polls" },
  { id: "news", label: "News" },
  { id: "petitions", label: "Petitions" },
];

export function FilterTabs({ activeFilter, onFilterChange }: FilterTabsProps) {
  return (
    <div className="filter-tabs" data-testid="filter-tabs">
      {filters.map((filter) => (
        <button
          key={filter.id}
          className={`filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
          onClick={() => onFilterChange(filter.id)}
          data-testid={`filter-${filter.id}`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
