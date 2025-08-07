package relics.reliceApi.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Rewards {
    private String _id;
    private String itemName;
    private String rarity;
    private String chance;
}
