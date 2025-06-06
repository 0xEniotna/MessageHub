# Contact Lists Import/Export Guide

MessageHub supports importing and exporting contact lists in JSON format, allowing you to backup your lists, share them with others, or migrate between different installations.

## Features

- **Export**: Download all your contact lists as a JSON file
- **Import**: Upload and merge contact lists from a JSON file
- **Validation**: Comprehensive validation of imported data
- **Duplicate handling**: Smart handling of duplicate list names
- **Backup**: Regular exports for data safety

## Export Functionality

### How to Export

1. Navigate to the "Group Lists" tab in MessageHub
2. Click the "Export" button in the top-right corner
3. Your browser will download a JSON file named `messagehub-contact-lists-YYYY-MM-DD.json`

### Export Format

The exported JSON contains:

- **version**: Format version (currently "1.0")
- **exportDate**: ISO timestamp of when the export was created
- **lists**: Array of all your contact lists

## Import Functionality

### How to Import

1. Navigate to the "Group Lists" tab in MessageHub
2. Click the "Import" button in the top-right corner
3. Select a valid JSON file from your computer
4. The system will validate the file and import the lists

### Import Validation

The import process validates:

- ✅ File is valid JSON format
- ✅ Contains required `lists` array
- ✅ Each list has required fields: `id`, `name`, `groups`
- ✅ Each group has required fields: `id`, `name`, `type`, `identifier`
- ✅ Group types are either "user" or "group"

### Duplicate Handling

When importing lists with names that already exist:

- You'll see a confirmation dialog listing the duplicates
- If you proceed, imported lists get "(Imported)" suffix
- Original lists remain unchanged
- New unique IDs are generated for all imported items

## JSON Format

### Structure

```json
{
  "version": "1.0",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "lists": [
    {
      "id": "unique-list-id",
      "name": "List Name",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "groups": [
        {
          "id": "unique-group-id",
          "name": "Contact Name",
          "type": "user|group",
          "identifier": "@username or ID"
        }
      ]
    }
  ]
}
```

### Field Descriptions

| Field                 | Type   | Description                                   |
| --------------------- | ------ | --------------------------------------------- |
| `version`             | string | Format version for compatibility              |
| `exportDate`          | string | ISO timestamp of export                       |
| `lists[].id`          | string | Unique identifier for the list                |
| `lists[].name`        | string | Display name of the list                      |
| `lists[].createdAt`   | string | ISO timestamp of creation                     |
| `lists[].groups[]`    | array  | Array of contacts in the list                 |
| `groups[].id`         | string | Unique identifier for the contact             |
| `groups[].name`       | string | Display name of the contact                   |
| `groups[].type`       | string | Either "user" or "group"                      |
| `groups[].identifier` | string | Telegram identifier (@username, phone, or ID) |

### Identifier Examples

Valid identifier formats:

- **Username**: `@username` (for users or groups)
- **Phone**: `+1234567890` (for users)
- **User ID**: `123456789` (numeric ID)
- **Group ID**: `-1001234567890` (negative for supergroups)

## Example File

See `docs/contact-lists-example.json` for a complete example with multiple lists and different contact types.

## Best Practices

### Regular Backups

- Export your lists regularly to prevent data loss
- Store backups in multiple locations (cloud storage, local files)
- Include the export date in backup file names

### Sharing Lists

- Remove sensitive information before sharing
- Verify recipient permissions for shared contacts
- Use descriptive list names for clarity

### Migration

- Export from old installation before upgrading
- Test import with a small file first
- Verify all lists imported correctly

## Troubleshooting

### Common Import Errors

**"Invalid file format: missing lists array"**

- Ensure JSON contains a top-level `lists` array
- Check JSON syntax is valid

**"Invalid list format: missing required fields"**

- Verify each list has `id`, `name`, and `groups` fields
- Check for typos in field names

**"Invalid group format: missing required fields"**

- Ensure each group has `id`, `name`, `type`, and `identifier`
- Verify `type` is either "user" or "group"

**"Please select a JSON file"**

- Ensure uploaded file has `.json` extension
- Check file isn't corrupted

### File Size Limits

- Browser memory limits apply to large files
- Recommended maximum: 1000 lists with 100 contacts each
- For larger datasets, split into multiple files

## Security Considerations

- Exported files contain contact information
- Store exports securely and encrypt if needed
- Be cautious when sharing files with others
- Review imported data before using

## Support

If you encounter issues with import/export functionality:

1. Check this guide for common solutions
2. Verify your JSON format matches the specification
3. Try with the example file to test functionality
4. Clear browser cache and try again
