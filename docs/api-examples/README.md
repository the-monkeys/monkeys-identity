# API Examples

This directory contains example JSON request and response files for the Monkeys Identity API.

## File Naming Convention

- Files ending with `_response.json` or `_response_utf8.json` contain API response examples
- Files without `_response` in the name are typically request examples
- `_utf8.json` files contain UTF-8 encoded versions of responses

## Categories

### Authentication
- `login.json` - Login request
- `login_response*.json` - Login responses
- `admin_create.json` - Admin creation request

### Organizations
- `create_org*.json` - Organization creation requests
- `create_org_response*.json` - Organization creation responses
- `update_org*.json` - Organization update requests/responses
- `list_orgs.json` - List organizations response
- `delete_org_response.json` - Organization deletion response

### Users
- `create_user*.json` - User creation requests/responses
- `update_user*.json` - User update requests/responses
- `get_user*.json` - User retrieval responses
- `list_users_response.json` - List users response

### Profiles
- `update_profile.json` - Profile update request
- `get_user_profile_response*.json` - Profile retrieval responses
- `update_user_profile_response*.json` - Profile update responses

### Other
- `token.txt` - Example authentication token
- `new_user_id.txt` - Example user ID
- `org_endpoints_docs.txt` - Organization endpoints documentation
- `temp.json` - Temporary/example data