# Pull changes from main to merge into the local branch

Pull changes from the remote main branch, if any, and merge the changes into the current local branch.

If there are merge conflicts after performing the merge, list out the files that need manual review of the conflicts and indicate that the user will need to manully commit the merged changes to their branch once the conflicts have been resolved.

If there are no merge conflicts, commit all changes to our current local branch. Follow git conventional commit standards and make sure to indicate in the commit message that the commit was due to merging in changes from the remote main branch.
