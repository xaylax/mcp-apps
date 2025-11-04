import { z } from "zod";
import { getGitApi } from "../utils/azure-devops-client";

// Tool to get file content from a repository
export const getRepositoryFileTool = {
    name: "git-get-repository-file",
    description: `
        Retrieves the content of a specific file from an Azure DevOps Git repository.
        
        This tool allows you to fetch the content of any file from a specified repository and branch.
        You can use this to view code, configuration files, or any other text-based content stored
        in your Azure DevOps repositories.
        
        Parameters:
        - organizationUrl: The Azure DevOps organization URL in the format https://dev.azure.com/{organization}
          Example: https://dev.azure.com/fabrikam
        - project: The exact name of the Azure DevOps project containing the repository
          Example: "FabrikamFiber"
        - repositoryName: The exact name of the Git repository to get the file from
          Example: "FabrikamFiber-Web"
        - filePath: The path to the file within the repository
          Example: "src/index.js" or "README.md"
        - branch: The branch name to retrieve the file from (default: "main")
          Example: "main", "master", "develop", "feature/new-feature"
    `,
    parameters: {
        organizationUrl: z.string().describe("Azure DevOps organization URL (e.g., https://dev.azure.com/organization)"),
        project: z.string().describe("Project name"),
        repositoryName: z.string().describe("Repository name"),
        filePath: z.string().describe("Path to the file within the repository"),
        branch: z.string().default("main").describe("Branch name (default: main)"),
    },
    handler: async ({ organizationUrl, project, repositoryName, filePath, branch }: {
        organizationUrl: string;
        project: string;
        repositoryName: string;
        filePath: string;
        branch: string;
    }) => {
        try {
            const gitApi = await getGitApi(organizationUrl);
            
            // Get the repository ID
            const repositories = await gitApi.getRepositories(project);
            const repository = repositories.find((repo) =>
                repo.name && repo.name.toLowerCase() === repositoryName.toLowerCase()
            );

            if (!repository || !repository.id) {
                return {
                    content: [{ type: "text" as const, text: `Repository "${repositoryName}" not found in project "${project}".` }],
                };
            }

            // File web URL in Azure DevOps (publicly accessible)
            const fileViewUrl = `${organizationUrl}/${project}/_git/${repositoryName}?path=${encodeURIComponent(filePath)}&version=GB${encodeURIComponent(branch)}&_a=contents`;
            
            try {
                // Get the file content from the repository
                const item = await gitApi.getItem(
                    repository.id,
                    filePath,
                    project,
                    undefined, // scopePath
                    undefined, // recursionLevel
                    undefined, // includeContentMetadata
                    undefined, // latestProcessedChange
                    undefined, // download
                    { version: branch, versionType: 0 } // versionDescriptor (0 = branch)
                );
                
                if (!item || !item.content) {
                    return {
                        content: [{ 
                            type: "text" as const, 
                            text: `File "${filePath}" not found on branch "${branch}" in repository "${repositoryName}".\n\nView in browser: ${fileViewUrl}` 
                        }],
                    };
                }
                
                return {
                    content: [{ 
                        type: "text" as const, 
                        text: `File: ${filePath}
Repository: ${repositoryName}
Branch: ${branch}
View in browser: ${fileViewUrl}

--- FILE CONTENT START ---
${item.content}
--- FILE CONTENT END ---`
                    }],
                };
                
            } catch (error) {
                console.error("Error retrieving file or branch:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // Check for common error messages
                if (errorMessage.includes("404") || errorMessage.includes("not found")) {
                    return {
                        content: [{ type: "text" as const, text: `File "${filePath}" or branch "${branch}" not found in repository "${repositoryName}".` }],
                    };
                }
                
                return {
                    content: [{ type: "text" as const, text: `Error retrieving file: ${errorMessage}` }],
                };
            }
        } catch (error) {
            console.error("Error getting repository file:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: "text" as const, text: `Error getting repository file: ${errorMessage}` }],
            };
        }
    }
};
