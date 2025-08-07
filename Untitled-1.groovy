const filteredProjects = (projects || []).filter((project) => {
  if (!project) return false; // Skip undefined or null projects

  const name = project.name || ""; // Fallback to an empty string if undefined
  const description = project.description || ""; // Fallback to an empty string if undefined
  const category = project.category || ""; // Fallback to an empty string if undefined

  return (
    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.toLowerCase().includes(searchQuery.toLowerCase())
  );
});