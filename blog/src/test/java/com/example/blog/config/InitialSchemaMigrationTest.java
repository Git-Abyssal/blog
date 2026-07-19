package com.example.blog.config;

import org.h2.tools.RunScript;
import org.junit.jupiter.api.Test;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InitialSchemaMigrationTest {

    @Test
    void createsOnlyTheSingleAuthorBlogSchema() throws Exception {
        try (var connection = DriverManager.getConnection(
                "jdbc:h2:mem:initial_schema;MODE=MySQL;DATABASE_TO_LOWER=TRUE")) {
            try (var stream = getClass().getResourceAsStream(
                    "/db/migration/V1__Initial_schema.sql")) {
                if (stream == null) {
                    throw new IllegalStateException("Initial schema migration is missing");
                }
                RunScript.execute(
                        connection,
                        new InputStreamReader(stream, StandardCharsets.UTF_8));
            }

            Set<String> expectedTables = Set.of(
                    "blog_owner",
                    "categories",
                    "tags",
                    "articles",
                    "article_tags",
                    "comments",
                    "password_history",
                    "audit_logs");
            assertEquals(expectedTables, applicationTables(connection));

            assertTrue(columnExists(connection, "blog_owner", "username"));
            assertTrue(columnExists(connection, "blog_owner", "password_changed"));
            assertTrue(columnExists(connection, "comments", "owner_comment"));
            assertTrue(columnExists(connection, "comments", "guest_name"));
            assertTrue(columnExists(connection, "comments", "status"));

            connection.createStatement().executeUpdate(
                    "INSERT INTO articles (title, content, status) VALUES ('Published', 'Body', 'published')");
            assertThrows(SQLException.class, () -> connection.createStatement().executeUpdate(
                    "INSERT INTO articles (title, content, status) VALUES ('Invalid', 'Body', 'unknown')"));
        }
    }

    private Set<String> applicationTables(Connection connection) throws Exception {
        var tables = new java.util.HashSet<String>();
        try (var result = connection.getMetaData().getTables(
                null, "public", null, new String[]{"TABLE"})) {
            while (result.next()) {
                String name = result.getString("TABLE_NAME").toLowerCase();
                if (!name.startsWith("flyway_")) {
                    tables.add(name);
                }
            }
        }
        return tables;
    }

    private boolean columnExists(
            Connection connection,
            String table,
            String column) throws Exception {
        try (var columns = connection.getMetaData().getColumns(
                null, "public", table, column)) {
            return columns.next();
        }
    }
}
