import sys
import os
import re

def create_flow(flow_name, category):
    # 1. Define Paths
    base_dir = os.path.join("src", "flows", category)
    file_path = os.path.join(base_dir, f"{flow_name}.ts")
    index_path = os.path.join("src", "index.ts")

    # 2. Create directory if not exists
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
        print(f"Created directory: {base_dir}")

    # 3. Genkit Flow Template
    # We use relative import to ../../lib/ai.js to access the configured 'ai' instance
    # This matches the pattern in src/flows/sample.ts
    ts_content = f"""import {{ ai, z }} from '../../lib/ai.js';

export const {flow_name} = ai.defineFlow(
  {{
    name: '{flow_name}',
    inputSchema: z.object({{
      subject: z.string(),
    }}),
    outputSchema: z.string(),
  }},
  async (input) => {{
    // TODO: Implement {flow_name} logic
    return `Processed ${{input.subject}} in {category}`;
  }}
);
"""

    # 4. Write Flow File
    if os.path.exists(file_path):
        print(f"Error: Flow '{flow_name}' already exists at {file_path}")
        sys.exit(1)

    with open(file_path, "w") as f:
        f.write(ts_content)
    print(f"Generated flow file: {file_path}")

    # 5. Inject into index.ts
    # We need to:
    # A. Add import statement
    # B. Add flow to startFlowsServer({ flows: [...] }) array

    try:
        with open(index_path, "r") as f:
            content = f.read()

        import_statement = f"import {{ {flow_name} }} from './flows/{category}/{flow_name}.js';\n"
        
        # A. Add Import
        if import_statement.strip() in content:
             print("Import already exists in index.ts")
        else:
            # Insert after the last import
            last_import_match = None
            for match in re.finditer(r"^import .+;", content, re.MULTILINE):
                last_import_match = match
            
            if last_import_match:
                end_pos = last_import_match.end()
                content = content[:end_pos] + "\n" + import_statement + content[end_pos:]
            else:
                content = import_statement + content

        # B. Add to flows array
        # Regex to find `flows: [...]` or `flows: array_variable`
        # We assume `flows: [` pattern for simplicity based on project style
        flows_pattern = r"(flows\s*:\s*\[)([^\]]*)(\])"
        match = re.search(flows_pattern, content)

        if match:
            prefix, current_flows, suffix = match.groups()
            
            # Parse current flows into a list of flow names
            # Handle formats like: "flow1, flow2" or "flow1,flow2" or ""
            flow_list = []
            if current_flows.strip():
                # Split by comma and clean each item
                flow_list = [f.strip() for f in current_flows.split(',') if f.strip()]
            
            # Check if flow_name already exists (exact match)
            if flow_name not in flow_list:
                # Add the new flow to the list
                flow_list.append(flow_name)
                
                # Rebuild the flows string with consistent formatting
                new_flows = ', '.join(flow_list)
                
                # Replace
                new_full_string = f"{prefix}{new_flows}{suffix}"
                content = content.replace(match.group(0), new_full_string)
                print(f"Registered {flow_name} in 'flows' array.")
            else:
                print(f"{flow_name} already in flows array.")

        else:
            print("Warning: Could not find 'flows: [...]' array in index.ts. Manual registration required.")

        with open(index_path, "w") as f:
            f.write(content)
            
        print(f"Updated {index_path}")

    except FileNotFoundError:
        print(f"Warning: {index_path} not found. Could not register flow automatically.")

def validate_identifier(name, label):
    """Ensure name is a valid JS identifier (alphanumeric + underscore, no leading digit)."""
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
        print(f"Error: {label} must be a valid identifier (got '{name}')")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generator.py <flow_name> <category>")
        sys.exit(1)
    
    flow_name = sys.argv[1]
    category = sys.argv[2]
    validate_identifier(flow_name, "flow_name")
    validate_identifier(category, "category")
    create_flow(flow_name, category)

