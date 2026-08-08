package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.model.WishlistEntry;
import relics.reliceApi.service.WishlistService;

import java.util.List;

/**
 * The wishlist.
 *
 * <p>No user parameter anywhere: the service is self-hosted and single-tenant,
 * so the list belongs to whoever is running it.
 */
@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public ResponseEntity<List<WishlistEntry>> get() {
        return ResponseEntity.ok(wishlistService.all());
    }

    /** Replaces the whole list — see WishlistService for why it is not incremental. */
    @PutMapping
    public ResponseEntity<List<WishlistEntry>> replace(@RequestBody List<WishlistEntry> entries) {
        return ResponseEntity.ok(wishlistService.replace(entries));
    }
}
